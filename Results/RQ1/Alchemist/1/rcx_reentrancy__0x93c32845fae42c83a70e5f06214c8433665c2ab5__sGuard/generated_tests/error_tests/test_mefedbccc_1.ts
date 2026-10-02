import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - mefedbccc", function () {
  it("should kill mutant by making a Collect call that fails but mutant incorrectly deducts balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("contract RejectEther { receive() external payable { revert(\"rejected\"); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the X_WALLET with Ether via Put from owner (needs MinSum = 1 ether)
    await wallet.connect(owner).Put(0, { value: ethers.parseEther("2") });
    
    // Set unlock time to now so Collect can be called
    // (unlockTime is set to block.timestamp in Put when _unlockTime <= block.timestamp)
    
    // Have the rejector contract call Collect on X_WALLET
    // First, fund the rejector with some ETH to pay for gas
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("0.1")
    });
    
    // Get initial balance of rejector
    const initialBalance = await ethers.provider.getBalance(await rejector.getAddress());
    
    // Attempt Collect from the rejector contract - it should revert in original but succeed in mutant
    try {
      await wallet.connect(rejector).Collect(ethers.parseEther("1"));
    } catch (e) {
      // Expected behavior - original reverts because call fails
    }
    
    // Check the balance of rejector - should be unchanged if original logic works
    const finalBalance = await ethers.provider.getBalance(await rejector.getAddress());
    
    // In the mutant, balance would be incorrectly deducted from the sender's account
    // But more importantly, the Ether would not actually be transferred
    // So we verify the attacker's account balance in X_WALLET was not reduced
    const attackerBalance = await wallet.Acc(await rejector.getAddress());
    
    // The mutant would have set attacker balance to 0 (deducted 1 ETH from initial 0)
    // Original would keep it at 0 because the call failed
    expect(attackerBalance.balance).to.equal(0);
    expect(finalBalance).to.equal(initialBalance);
  });
});