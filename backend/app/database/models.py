import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON
from app.database.session import Base

class Memory(Base):
    __tablename__ = "memories"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(64), nullable=False, default="general")
    key = Column(String(128), nullable=False, index=True)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String(32), default="pending")  # pending, completed, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="todo") # todo, in_progress, done
    priority = Column(String(32), default="normal") # low, normal, high, urgent
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Automation(Base):
    __tablename__ = "automations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    trigger = Column(JSON, nullable=False) # e.g. {"type": "schedule", "time": "08:00"} or {"type": "battery", "threshold": 20}
    actions = Column(JSON, nullable=False) # list of tool actions
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ToolLog(Base):
    __tablename__ = "tool_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_command = Column(Text, nullable=True)
    tool = Column(String(128), nullable=False)
    arguments = Column(JSON, nullable=True)
    result = Column(Text, nullable=True)
    status = Column(String(32), default="SUCCESS") # SUCCESS, ERROR, REJECTED, CANCELLED
    execution_time = Column(Float, default=0.0)

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(32), nullable=False) # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_call = Column(JSON, nullable=True)
    tool_result = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SmartDevice(Base):
    __tablename__ = "smart_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(128), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    device_type = Column(String(64), nullable=False) # light, switch, sensor, camera, climate
    state = Column(JSON, nullable=False, default=dict)
    room = Column(String(64), default="Living Room")
    is_online = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
