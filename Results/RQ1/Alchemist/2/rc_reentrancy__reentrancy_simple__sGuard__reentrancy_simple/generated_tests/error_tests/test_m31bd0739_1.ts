import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - m31bd0739", function () {
  it("should revert when withdrawBalance fails to send Ether, keeping balance unchanged", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that rejects incoming Ether
    const RejectorFactory = await ethers.getContractFactory("EtherRejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the rejector contract's balance in Reentrance
    const fundAmount = ethers.parseEther("1.0");
    await instance.connect(owner).addToBalance({ value: fundAmount });
    
    // Transfer ownership of the balance to the rejector contract address
    // (We need the rejector to have a balance in Reentrance to withdraw)
    await instance.connect(owner).addToBalance({ value: ethers.parseEther("0.5") });
    
    // Actually let's set up properly: have the rejector contract add balance to Reentrance
    await rejector.connect(attacker).addToReentrance(await instance.getAddress(), { value: fundAmount });
    
    // Verify balance before withdrawal
    const balanceBefore = await instance.getBalance(await rejector.getAddress());
    expect(balanceBefore).to.equal(fundAmount);
    
    // Attempt withdrawal - this should revert in original because call fails
    await expect(
      rejector.connect(attacker).attack(await instance.getAddress())
    ).to.be.reverted;
    
    // Verify balance is unchanged (mutant would set it to 0, failing this assertion)
    const balanceAfter = await instance.getBalance(await rejector.getAddress());
    expect(balanceAfter).to.equal(fundAmount);
  });
});

// Helper contract that rejects Ether and can interact with Reentrance
contract EtherRejector {
  function addToReentrance(address reentranceAddr) external payable {
    (bool success, ) = reentranceAddr.call{value: msg.value}(
      abi.encodeWithSignature("addToBalance()")
    );
    require(success, "addToBalance failed");
  }
  
  function attack(address reentranceAddr) external {
    (bool success, ) = reentranceAddr.call(
      abi.encodeWithSignature("withdrawBalance()")
    );
    require(success, "withdrawBalance failed");
  }
  
  // Reject incoming Ether
  receive() external payable {
    revert("EtherRejector: rejecting Ether");
  }
}