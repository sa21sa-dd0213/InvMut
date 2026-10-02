import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant m96b1dac9 - remove onlyOwner from withdraw", function () {
  it("should revert when non-owner calls withdraw on original, but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH for testing
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Check initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("10"));
    
    // Attacker tries to withdraw - on original this would revert, on mutant it succeeds
    await expect(
      instance.connect(attacker).withdraw(ethers.parseEther("5"))
    ).to.not.be.reverted;
    
    // Verify attacker received funds
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.be.lessThan(initialBalance);
  });
});