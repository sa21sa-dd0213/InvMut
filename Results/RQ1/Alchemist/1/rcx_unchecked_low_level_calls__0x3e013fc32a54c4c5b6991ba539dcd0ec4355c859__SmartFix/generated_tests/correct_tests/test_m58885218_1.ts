import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - withdraw access control", function () {
  it("should revert when non-owner calls withdraw on original, but mutant allows non-owner to call", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for MultiplicatorX4)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether to make withdraw meaningful
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Verify initial balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(fundAmount);
    
    // Attempt to call withdraw from non-owner (attacker) - should revert on original, succeed on mutant
    // If the mutant is present, this call will NOT revert (because require(msg.sender != Owner) passes for attacker)
    // We expect it to revert, so if it doesn't revert, the test fails, killing the mutant
    await expect(
      instance.connect(attacker).withdraw()
    ).to.be.reverted;
    
    // Also verify owner can still withdraw (should pass on original)
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await instance.connect(owner).withdraw();
    const receipt = await tx.wait();
    
    // Verify funds transferred to owner
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + fundAmount - gasCost);
  });
});