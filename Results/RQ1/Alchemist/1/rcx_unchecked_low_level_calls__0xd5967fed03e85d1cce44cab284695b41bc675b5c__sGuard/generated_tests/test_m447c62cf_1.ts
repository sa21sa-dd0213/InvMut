import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m447c62cf by detecting off-by-one in loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple target contract to count calls
    const TargetFactory = await ethers.getContractFactory("contract TargetCounter { uint256 public callCount; function transferFrom(address, address, uint256) external returns (bool) { callCount++; return true; } }");
    const target = await TargetFactory.deploy();
    await target.waitForDeployment();

    // Prepare test data: array with 2 recipients
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // Call transfer function
    const tx = await instance.transfer(owner.address, await target.getAddress(), recipients, value);
    await tx.wait();

    // Get call count from target contract
    const callCount = await target.callCount();

    // On original: callCount should equal recipients.length (2)
    // On mutant: callCount will be recipients.length + 1 (3) due to <= causing one extra iteration
    expect(callCount).to.equal(recipients.length);
  });
});