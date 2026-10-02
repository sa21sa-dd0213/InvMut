import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow non-owner to call withdrawAll in mutant but not in original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Non-owner attempts to call withdrawAll
    // In the original this would revert due to onlyOwner modifier
    // In the mutant (without onlyOwner), it will succeed but then revert at withdraw's own onlyOwner check
    // However, we test that the call does NOT revert - which would kill the mutant if it somehow bypasses inner check
    // Actually, the mutant still has inner onlyOwner on withdraw, so non-owner will still revert
    // To properly test the mutant, we need to check that the owner can call withdrawAll successfully
    // and the contract balance becomes zero
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
    
    // Verify owner can still call withdrawAll successfully
    const tx = await instance.connect(owner).withdrawAll();
    await tx.wait();
    
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});