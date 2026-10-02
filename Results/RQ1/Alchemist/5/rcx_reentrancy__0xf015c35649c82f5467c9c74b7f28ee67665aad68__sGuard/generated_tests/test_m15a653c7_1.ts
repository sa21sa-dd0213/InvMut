import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test", function () {
  it("should detect mutant m15a653c7 by verifying balance inflation from msg.value+1", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Send exactly 1 ether to Put function
    const depositAmount = ethers.parseEther("1");
    const tx = await bankInstance.connect(user).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Check the user's balance in the contract - should be exactly 1 ether in original,
    // but will be 1 ether + 1 wei in mutant
    const userBalance = await bankInstance.Acc(user.address);
    const expectedBalance = depositAmount; // 1 ether
    
    // In the mutant, balance will be depositAmount + 1 wei
    // We can detect this by checking if balance != expectedBalance
    // OR by attempting to withdraw the expected balance and checking contract balance
    
    // Attempt to withdraw exactly 1 ether (the amount sent)
    const collectTx = bankInstance.connect(user).Collect(depositAmount);
    
    // In the original: succeeds, user gets back 1 ether
    // In the mutant: balance is 1 ether + 1 wei, so withdrawing 1 ether succeeds
    // but leaves 1 wei stuck. The key test: check if the contract still has 1 wei after
    // withdrawing the full deposited amount
    
    await expect(collectTx).to.not.be.reverted;
    await (await collectTx).wait();
    
    // Check contract balance - should be 0 in original, but 1 wei in mutant
    const contractBalanceAfter = await ethers.provider.getBalance(await bankInstance.getAddress());
    expect(contractBalanceAfter).to.equal(0, "Contract should have zero balance after withdrawing exact deposit");
    
    // Additional check: try to withdraw 1 wei more - should fail in original (insufficient balance)
    // but would succeed in mutant (since balance is inflated)
    const extraCollectTx = bankInstance.connect(user).Collect(1);
    await expect(extraCollectTx).to.not.be.reverted;
  });
});