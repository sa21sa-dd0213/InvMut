import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - gas cost difference", function () {
  it("should detect the mutant by measuring increased gas cost when sha256 replaces keccak256", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Fund the contract with some initial balance for potential transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    
    // Measure gas cost of calling play() multiple times
    const GAS_THRESHOLD = 60000n; // keccak256 typically costs ~21000-30000 gas for this function
    
    for (let i = 0; i < 5; i++) {
      // Mine a new block to change block.timestamp and block.difficulty
      await ethers.provider.send("evm_mine", []);
      
      // Get the current gas price for estimation
      const gasPrice = await ethers.provider.getFeeData();
      
      // Call play() and measure gas used
      const tx = await player.sendTransaction({
        to: await instance.getAddress(),
        value: TICKET_AMOUNT,
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      
      // sha256 is significantly more expensive than keccak256
      // If gasUsed exceeds threshold, it indicates the mutant is present
      if (gasUsed > GAS_THRESHOLD) {
        // Mutant detected - sha256 costs more gas
        expect(gasUsed).to.be.gt(GAS_THRESHOLD);
        return; // Test passes by detecting the mutant
      }
    }
    
    // If we reach here, gas was always below threshold (original keccak256 behavior)
    // This would be unexpected for the mutant, so we fail
    expect.fail("Gas cost never exceeded threshold - mutant may not be present");
  });
});