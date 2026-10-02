import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9e21efb0 test", function () {
  it("should deploy with correct owner and allow withdrawAll from owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    
    // Deploy with owner as the signer address
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Send some ether to the contract
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Check balance before withdrawal
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));
    
    // Attempt withdrawal from the owner - should succeed in original, fail in mutant
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
    
    // Verify the contract balance is now zero
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(0);
  });
});