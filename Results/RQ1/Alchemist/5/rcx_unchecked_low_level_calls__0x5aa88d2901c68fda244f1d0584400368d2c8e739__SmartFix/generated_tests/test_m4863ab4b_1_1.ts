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
    
    // Calculate exact amount that causes overflow in mutant:
    // In original: require((balance + msg.value) >= balance)
    // In mutant: require((balance + msg.value + 1) >= balance)
    // Mutant overflows when balance + msg.value + 1 > type(uint256).max
    // So msg.value = type(uint256).max - balance causes overflow in mutant
    const maxUint = ethers.MaxUint256;
    const overflowValue = maxUint - balanceBefore;
    
    // Send the overflow-causing value from owner (who is authorized)
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: overflowValue
    });
    
    // Mutant: require should revert (overflow), killing the mutant
    await expect(tx).to.be.reverted;
    
    // Verify balance unchanged - mutant should have reverted
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});