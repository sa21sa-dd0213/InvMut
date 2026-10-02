import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL - Kill mutant mf6561abf", function () {
  it("should revert when Collect ETH transfer fails (mutant removes revert)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the RejectingContract that will reject incoming ETH
    const RejectFactory = await ethers.getContractFactory("RejectingContract");
    const rejectContract = await RejectFactory.deploy();
    await rejectContract.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Initialize the contract and set MinSum
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.SetLogFile(ethers.getAddress("0x0000000000000000000000000000000000000001"));
    await instance.Initialized();
    
    // Fund the contract with ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Fund the rejecting contract so it has balance
    await owner.sendTransaction({
      to: await rejectContract.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Have rejecting contract deposit ETH into PRIVATE_ETH_CELL to have balance >= MinSum
    await rejectContract.depositTo(await instance.getAddress(), {
      value: ethers.parseEther("1")
    });
    
    // Now call Collect from the rejecting contract - should revert because transfer fails
    // The rejecting contract's receive() will revert on incoming ETH
    await expect(
      rejectContract.collectFrom(await instance.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
    
    // Also verify that balance was NOT deducted from rejecting contract in PRIVATE_ETH_CELL
    const balanceAfter = await instance.balances(await rejectContract.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("1"));
  });
});

// Helper contract that rejects incoming ETH and has deposit/collect functions
contract RejectingContract {
  receive() external payable {
    revert("ETH transfer rejected");
  }
  
  function depositTo(address target) external payable {
    (bool success, ) = target.call{value: msg.value}("");
    require(success, "Deposit failed");
  }
  
  function collectFrom(address target, uint256 amount) external {
    (bool success, ) = target.call(
      abi.encodeWithSignature("Collect(uint256)", amount)
    );
    require(success, "Collect call failed");
  }
}