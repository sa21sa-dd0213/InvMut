import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should kill mutant maa861c12 by testing balance exactly equal to MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // Deposit exactly 1 ether (MinSum) - this should satisfy acc.balance >= MinSum in original
    const depositTx = await instance.connect(user).Put(0, { value: MinSum });
    await depositTx.wait();
    
    // Advance time past the unlockTime (which was set to block.timestamp since we used 0)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect exactly 1 ether (acc.balance == MinSum == 1 ether)
    // In original: passes because acc.balance >= MinSum (1 >= 1)
    // In mutant: fails because acc.balance > MinSum (1 > 1 is false)
    await expect(
      instance.connect(user).Collect(MinSum)
    ).to.not.be.reverted;
    
    // Verify the balance was reduced (original behavior)
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(0);
  });
});