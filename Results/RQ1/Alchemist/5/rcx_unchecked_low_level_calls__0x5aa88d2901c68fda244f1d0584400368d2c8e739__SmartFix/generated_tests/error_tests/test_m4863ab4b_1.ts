import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - m4863ab4b", function () {
  it("should kill mutant by exploiting overflow boundary shift in require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // First fund the contract with some ether to have a non-zero balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });
    
    // Get current contract balance
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    
    // Calculate exact amount that causes overflow in original:
    // In original: require((balance + msg.value) >= balance)
    // Overflow when balance + msg.value > type(uint256).max
    // So msg.value = type(uint256).max - balance + 1 causes overflow in original
    // In mutant: require((balance + msg.value + 1) >= balance) 
    // Overflow when balance + msg.value + 1 > type(uint256).max
    // So msg.value = type(uint256).max - balance causes overflow in mutant
    // We send msg.value = type(uint256).max - balance (which overflows mutant but not original)
    const maxUint = ethers.MaxUint256;
    const overflowValue = maxUint - balanceBefore;
    
    // The mutant should NOT revert for this value (original would revert)
    // But the mutant's require will revert because:
    // (balance + (maxUint - balance) + 1) = maxUint + 1 > maxUint -> overflow
    // Actually let's recalculate: mutant overflows when msg.value = maxUint - balance
    // Because balance + (maxUint - balance) + 1 = maxUint + 1 -> overflow -> require fails
    // So this test will fail on mutant (require reverts) but pass on original (require passes)
    
    // Send the overflow-causing value from owner (who is authorized)
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: overflowValue
    });
    
    // Mutant: require should revert (overflow), killing the mutant
    // Original: require passes, transfer happens
    await expect(tx).to.be.reverted;
    
    // Verify balance unchanged - mutant should have reverted
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});