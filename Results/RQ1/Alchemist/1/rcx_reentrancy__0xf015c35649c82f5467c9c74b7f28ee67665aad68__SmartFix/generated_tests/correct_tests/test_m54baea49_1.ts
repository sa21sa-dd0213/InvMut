import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant m54baea49 (Put: >= changed to >)", function () {
  it("should allow zero-value deposit (msg.value = 0) in Put, but mutant reverts", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Call Put with 0 ether (zero value) - should succeed in original, fail in mutant
    const tx = await instance.connect(owner).Put(0, { value: 0 });
    const receipt = await tx.wait();
    
    // Verify the transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);
    
    // Also verify the balance was updated correctly (should remain 0)
    const holder = await instance.Acc(await owner.getAddress());
    expect(holder.balance).to.equal(0);
  });
});