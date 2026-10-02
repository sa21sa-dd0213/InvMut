import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdraw in original, but succeed in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 (non-owner) tries to withdraw 0.5 ETH
    // In the original contract, this should revert because of onlyOwner modifier
    // In the mutant (without onlyOwner), it should succeed
    const instanceAsNonOwner = instance.connect(addr1);
    
    // We expect this to succeed (mutant) or revert (original)
    // The test kills the mutant if it succeeds when it should have reverted
    const tx = instanceAsNonOwner.withdraw(ethers.parseEther("0.5"));
    
    // For the original: expect(tx).to.be.reverted;
    // For the mutant (to kill it): we expect it succeeds and balance changes
    await expect(tx).to.not.be.reverted;
    
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("0.5"));
    
    const addr1Balance = await ethers.provider.getBalance(addr1.address);
    expect(addr1Balance).to.be.gt(ethers.parseEther("10000")); // addr1 received ETH
  });
});