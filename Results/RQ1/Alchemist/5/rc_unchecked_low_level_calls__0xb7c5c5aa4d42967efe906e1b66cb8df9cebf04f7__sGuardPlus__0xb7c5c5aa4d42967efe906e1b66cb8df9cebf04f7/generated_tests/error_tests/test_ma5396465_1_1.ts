import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - ma5396465", function () {
  it("should detect the mutant that adds 1 wei to balance in fallback", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 5 wei via fallback
    const sendAmount = BigInt(5); // 5 wei
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount,
    });
    await tx.wait();

    // Get initial balance of contract
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // User withdraws their balance
    const withdrawTx = await instance.connect(user).withdraw();
    const receipt = await withdrawTx.wait();

    // Check the contract balance decreased by exactly sendAmount
    const contractBalanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceBefore - contractBalanceAfter).to.equal(sendAmount);

    // Also verify user's balance in contract is zero after withdrawal
    const userBalance = await instance.balances(user.address);
    expect(userBalance).to.equal(0);
  });
});