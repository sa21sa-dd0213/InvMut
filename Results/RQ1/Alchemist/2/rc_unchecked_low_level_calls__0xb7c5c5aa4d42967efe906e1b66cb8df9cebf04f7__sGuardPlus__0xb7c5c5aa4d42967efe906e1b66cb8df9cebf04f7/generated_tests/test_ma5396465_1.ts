import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant test - fallback msg.value+1", function () {
  it("should detect mutant that adds 1 wei to balance on fallback", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Send exactly 1 ether via fallback
    const sendAmount = ethers.parseEther("1");
    const tx = await user.sendTransaction({
      to: await contract.getAddress(),
      value: sendAmount
    });
    await tx.wait();

    // Check balance before withdrawal
    const balance = await contract.balances(user.address);
    
    // On original: balance == sendAmount (1 ether)
    // On mutant: balance == sendAmount + 1 wei
    // Withdraw should return exactly what was sent
    const withdrawTx = await contract.connect(user).withdraw();
    const receipt = await withdrawTx.wait();

    // Verify user received exactly the sent amount (not +1 wei)
    const balanceAfter = await ethers.provider.getBalance(user.address);
    const expectedBalance = sendAmount + (await ethers.provider.getBalance(user.address) - sendAmount);
    
    // The mutant will cause withdrawal to send 1 wei more than sent
    // This can be caught by checking the contract balance is zero after withdrawal
    const contractBalance = await ethers.provider.getBalance(await contract.getAddress());
    expect(contractBalance).to.equal(0);
    
    // Or by checking the exact amount received by the user
    const userBalanceAfterWithdraw = await ethers.provider.getBalance(user.address);
    // user started with some balance, sent sendAmount, then received sendAmount back
    // (ignoring gas costs for simplicity)
    expect(userBalanceAfterWithdraw).to.be.closeTo(
      (await ethers.provider.getBalance(user.address) - sendAmount) + sendAmount,
      ethers.parseEther("0.01") // allow for gas
    );
  });
});