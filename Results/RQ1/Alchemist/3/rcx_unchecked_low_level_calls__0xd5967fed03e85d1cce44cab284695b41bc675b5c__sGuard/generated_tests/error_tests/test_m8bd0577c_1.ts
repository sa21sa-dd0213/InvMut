import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8bd0577c by verifying loop execution with non-empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple receiver contract that records calls to transferFrom
    const ReceiverFactory = await ethers.getContractFactory("SimpleReceiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();
    
    // Prepare test parameters
    const from = owner.address;
    const tos = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");
    
    // Call transfer on the demo contract
    const tx = await instance.transfer(from, await receiver.getAddress(), tos, value);
    await tx.wait();
    
    // Verify that the receiver contract received exactly 2 calls (one per address in tos)
    const callCount = await receiver.getCallCount();
    expect(callCount).to.equal(2);
    
    // Verify the details of each call (optional but thorough)
    const call1 = await receiver.getCall(0);
    const call2 = await receiver.getCall(1);
    
    expect(call1.from).to.equal(from);
    expect(call1.to).to.equal(tos[0]);
    expect(call1.value).to.equal(value);
    
    expect(call2.from).to.equal(from);
    expect(call2.to).to.equal(tos[1]);
    expect(call2.value).to.equal(value);
  });
});

// Simple receiver contract to track calls
contract SimpleReceiver {
    struct Call {
        address from;
        address to;
        uint256 value;
    }
    
    Call[] public calls;
    uint256 public callCount;
    
    function transferFrom(address from, address to, uint256 value) external {
        calls.push(Call(from, to, value));
        callCount++;
    }
    
    function getCall(uint256 index) external view returns (address from, address to, uint256 value) {
        require(index < calls.length, "Index out of bounds");
        Call memory c = calls[index];
        return (c.from, c.to, c.value);
    }
}