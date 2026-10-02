import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET - Kill mutant mefedbccc (Collect always succeeds)", function () {
  it("should not deduct balance when external call fails, but mutant deducts anyway", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious contract that rejects incoming Ether
    // We need to deploy a simple contract that has no receive/fallback
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the wallet from attacker
    const depositAmount = ethers.parseEther("2");
    await attacker.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount
    });
    
    // Set unlock time to past so Collect can be called
    const unlockTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    await wallet.connect(attacker).Put(unlockTime);
    
    // Get initial balance of attacker in wallet
    const holderBefore = await wallet.Acc(attacker.address);
    const initialBalance = holderBefore.balance;
    
    // Attempt to collect 1 ether - this call will fail because rejector rejects Ether
    const collectAmount = ethers.parseEther("1");
    
    // Check that the call to rejector reverts (it will reject)
    await expect(
      wallet.connect(attacker).Collect(collectAmount)
    ).to.not.be.reverted; // The transaction itself doesn't revert, but the internal call fails
    
    // Get balance after the attempt
    const holderAfter = await wallet.Acc(attacker.address);
    
    // In the ORIGINAL: balance should remain unchanged because _s was false
    // In the MUTANT: balance will be deducted because condition is always true
    // So if balance decreased, the mutant is detected
    expect(holderAfter.balance).to.equal(initialBalance);
  });
});