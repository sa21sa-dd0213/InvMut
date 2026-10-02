import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m7f62e0e5 test", function () {
  it("should detect mutant that replaces !_s with true in withdrawBalance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for Reentrance)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).addToBalance({ value: depositAmount });

    // Verify balance was recorded
    expect(await instance.getBalance(user.address)).to.equal(depositAmount);

    // Get initial ether balance of user
    const initialUserBalance = await ethers.provider.getBalance(user.address);

    // User withdraws their balance
    const tx = await instance.connect(user).withdrawBalance();
    const receipt = await tx.wait();

    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    // Verify user's balance in contract is now 0
    expect(await instance.getBalance(user.address)).to.equal(0);

    // Verify user received the ether (minus gas costs)
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    expect(finalUserBalance).to.equal(initialUserBalance + depositAmount - gasCost);
  });
});