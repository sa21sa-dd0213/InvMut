import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m88fb2d50 test", function () {
  it("should detect mutant that replaces oCredit>0 with false", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits 1 ETH
    const depositTx = await instance.connect(user).deposit({ value: depositAmount });
    await depositTx.wait();

    // Get user's balance before withdrawal
    const userBalanceBefore = await ethers.provider.getBalance(user.address);
    
    // User calls withdrawAll
    const withdrawTx = await instance.connect(user).withdrawAll();
    await withdrawTx.wait();

    // Get user's balance after withdrawal
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    // In the original contract, the user should have received the 1 ETH back
    // In the mutant, the withdrawal never happens due to if(false)
    // So the balance difference should be at least the deposit amount minus gas
    const balanceDifference = userBalanceAfter - userBalanceBefore;
    
    // The mutant will fail this assertion because the balance difference
    // will be negative (gas costs) instead of positive (deposit returned)
    expect(balanceDifference).to.be.gt(0);
  });
});