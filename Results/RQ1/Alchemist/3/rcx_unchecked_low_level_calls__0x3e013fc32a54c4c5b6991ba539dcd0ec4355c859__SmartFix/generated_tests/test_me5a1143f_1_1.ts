import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - msg.value+1", function () {
  it("should kill mutant by verifying exact msg.value is forwarded, not msg.value+1", async function () {
    const [owner, target] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some initial balance to avoid insufficient funds issues
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Get initial balances
    const initialTargetBalance = await ethers.provider.getBalance(target.address);
    const sendAmount = ethers.parseEther("1");

    // Call Command with exact msg.value
    const tx = await instance.connect(owner).Command(
      target.address,
      "0x",
      { value: sendAmount }
    );
    await tx.wait();

    // Get final target balance
    const finalTargetBalance = await ethers.provider.getBalance(target.address);
    const actualTransfer = finalTargetBalance - initialTargetBalance;

    // In the original, actualTransfer should equal sendAmount
    // In the mutant, actualTransfer will be sendAmount + 1 wei
    expect(actualTransfer).to.equal(sendAmount);
  });
});