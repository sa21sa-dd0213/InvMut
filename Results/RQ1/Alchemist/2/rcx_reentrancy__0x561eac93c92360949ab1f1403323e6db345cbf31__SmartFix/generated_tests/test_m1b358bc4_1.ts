import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection test", function () {
  it("should revert when Collect is called but the ether transfer fails (original reverts, mutant does not)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a LogFile contract to satisfy the Log dependency
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize and configure the contract
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.Initialized();
    
    // Fund addr1 with enough balance to satisfy MinSum and the withdrawal amount
    const depositAmount = ethers.parseEther("5");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify balance is set
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);
    
    // Create a contract that will reject incoming ether (to simulate failed call)
    const Rejector = await ethers.getContractFactory("Rejector");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();
    
    // Transfer ownership of addr1's balance to the rejector contract address
    // Since we can't change msg.sender, we'll use the rejector as the caller
    // First, fund the rejector contract directly
    await instance.connect(rejector).Deposit({ value: depositAmount });
    await instance.connect(rejector).SetMinSum(ethers.parseEther("1"));
    
    // Now try to collect from the rejector contract (which cannot receive ether)
    const collectAmount = ethers.parseEther("1");
    
    // In original: should revert because external call fails
    // In mutant: should NOT revert (balance deducted but ether not sent)
    await expect(
      instance.connect(rejector).Collect(collectAmount)
    ).to.be.reverted;
    
    // Additional check: if mutant, balance would be incorrectly deducted
    // If original, balance should remain unchanged due to revert
    expect(await instance.balances(rejector.address)).to.equal(depositAmount);
  });
});

// Helper contract to reject ether
contract Rejector {
  receive() external payable {
    revert("I reject your payment");
  }
}