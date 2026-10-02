import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test", function () {
  it("should kill mutant m9049812d by testing failed external call doesn't deduct balance", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Fund the bank with some initial balance via Put
    const putTx = await bank.connect(attacker).Put(0, { value: ethers.parseEther("10") });
    await putTx.wait();
    
    // Get initial balance
    const holderBefore = await bank.Acc(attacker.address);
    const initialBalance = holderBefore.balance;
    
    // Deploy a contract that rejects ether
    const rejectorArtifact = await ethers.getContractFactory("Rejector");
    const rejector = await rejectorArtifact.deploy();
    await rejector.waitForDeployment();
    
    // Deploy proxy contract that will call Collect and revert on receive
    const proxyArtifact = await ethers.getContractFactory("Proxy");
    const proxy = await proxyArtifact.deploy();
    await proxy.waitForDeployment();
    
    // Fund the proxy's bank account
    const fundProxyTx = await bank.connect(proxy).Put(0, { value: ethers.parseEther("3") });
    await fundProxyTx.wait();
    
    // Verify the proxy has balance
    const proxyHolder = await bank.Acc(proxy.address);
    expect(proxyHolder.balance).to.equal(ethers.parseEther("3"));
    
    // Now call Collect through the proxy - this should fail because proxy rejects ether
    // The external call will fail, _s will be false
    // Original: balance should NOT be deducted
    // Mutant: balance WILL be deducted (incorrectly)
    try {
      const collectTx = await proxy.connect(proxy).callCollect(await bank.getAddress(), ethers.parseEther("1"));
      await collectTx.wait();
    } catch (e) {
      // Transaction may revert in original due to sub_uint256 check failing
      // But we need to check the balance after
    }
    
    // Check final balance - in original it should still be 3 ether
    // In mutant it would be 2 ether (incorrectly deducted)
    const finalHolder = await bank.Acc(proxy.address);
    
    // This assertion should fail (kill) the mutant because the mutant deducted balance
    // but the original would not have deducted due to failed call
    expect(finalHolder.balance).to.equal(ethers.parseEther("3"));
  });
});