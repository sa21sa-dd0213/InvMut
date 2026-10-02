import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - mf51ce9e7", function () {
  it("should detect mutant that changes loop condition from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that can receive calls and track them
    const TrackerFactory = await ethers.getContractFactory("Tracker");
    const tracker = await TrackerFactory.deploy();
    await tracker.waitForDeployment();
    
    // Set the caddress in EBU to the tracker contract
    await instance.setCaddress(await tracker.getAddress());
    
    // Prepare test data - one recipient and a value
    const recipients = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 in transfer)
    
    // Call transfer from the authorized address (0x9797...)
    const tx = await instance.connect(owner).transfer(recipients, values);
    await tx.wait();
    
    // Check that the tracker received a call (original contract would call it)
    // Mutant loop condition i > _tos.length means loop never executes
    const callCount = await tracker.getCallCount();
    expect(callCount).to.equal(1, "Expected transfer to execute the loop and make one call");
  });
});