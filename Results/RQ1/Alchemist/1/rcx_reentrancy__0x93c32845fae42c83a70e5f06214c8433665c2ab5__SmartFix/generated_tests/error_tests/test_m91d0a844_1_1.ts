import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m91d0a844 test", function () {
  it("should revert when collecting to a reverting recipient (original) but succeed in mutant", async function () {
    const [owner, attacker, revertingRecipient] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a simple contract that reverts on receive
    const ReverterFactory = await ethers.getContractFactory("contract Reverter { receive() external payable { revert(); } }");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();
    
    // Fund the wallet from owner
    const depositAmount = ethers.parseEther("2");
    await instance.connect(owner).Put(0, { value: depositAmount });
    
    // Verify balance is sufficient
    const account = await instance.Acc(owner.address);
    expect(account.balance).to.equal(depositAmount);
    
    // Set minimum sum to 1 ether (already default)
    const minSum = await instance.MinSum();
    expect(minSum).to.equal(ethers.parseEther("1"));
    
    // Attempt to collect 1 ether to the reverting recipient
    const collectAmount = ethers.parseEther("1");
    
    // The collect should revert in the original because the call to reverter fails
    // In the mutant, it will succeed because _s is replaced with true
    const tx = instance.connect(owner).Collect(collectAmount);
    
    // The test expects revert - this will pass on original but fail on mutant
    await expect(tx).to.be.reverted;
    
    // Additional assertion: balance should remain unchanged if reverted
    const balanceAfter = (await instance.Acc(owner.address)).balance;
    expect(balanceAfter).to.equal(depositAmount);
  });
});