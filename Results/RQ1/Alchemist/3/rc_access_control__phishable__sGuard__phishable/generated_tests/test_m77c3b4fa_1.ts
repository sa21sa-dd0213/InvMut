import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test - m77c3b4fa", function () {
  it("should revert when non-owner calls withdrawAll on original, but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract with owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Verify contract has balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));
    
    // Try to call withdrawAll from non-owner address - should revert on original
    // This test will kill the mutant because the mutant allows the call to succeed
    await expect(
      instance.connect(addr1).withdrawAll(addr2.address)
    ).to.be.reverted;
  });
});