import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant kill test - Collect with failing recipient", function () {
  it("should detect mutant by reverting when recipient cannot receive ETH", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy a contract that rejects ETH (no receive/fallback)
    const RejectFactory = await ethers.getContractFactory("contract Rejector { function() external payable { revert(); } }");
    // Actually, we'll use a simple address that is a contract without payable fallback
    // Better: create a simple contract that always reverts on ETH transfer
    const rejectCode = "0x6080604052600080fdfe"; // Minimal contract that does nothing and has no fallback
    const rejector = await ethers.deployContract("Rejector", { value: 0 });
    // Alternative: use a pre-funded address that is actually a contract without ETH capabilities
    // Let's use a simple approach: create a contract that will reject calls
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { fallback() external payable { revert(); } }");
    const rejectorContract = await RejectorFactory.deploy();
    await rejectorContract.waitForDeployment();
    
    const rejectorAddress = await rejectorContract.getAddress();
    
    // Fund the rejector address via bank.Put
    const putAmount = ethers.parseEther("2");
    await bank.connect(addr1).Put(0, { value: putAmount });
    
    // Wait for unlock time (unlockTime = block.timestamp since we put 0)
    // Now try to collect from the rejector address
    const collectAmount = ethers.parseEther("1");
    
    // In original: call will fail, balance not deducted
    // In mutant: balance would be deducted despite call failure
    const balanceBefore = await bank.Acc(rejectorAddress);
    
    // Attempt collect - this should revert or succeed depending on mutant
    try {
      const tx = await bank.connect(addr1).Collect(collectAmount);
      await tx.wait();
      
      // If we reach here, check that balance is unchanged (original behavior)
      const balanceAfter = await bank.Acc(addr1);
      // In mutant, balance would have been deducted - this assertion would fail
      expect(balanceAfter.balance).to.equal(balanceBefore.balance);
    } catch (error) {
      // If it reverts, that's expected for original (call fails, but Collect doesn't revert)
      // Actually the original doesn't revert on failed call, it just skips balance update
      // So we should NOT get a revert in original
      expect.fail("Collect should not revert in original, but did");
    }
  });
});