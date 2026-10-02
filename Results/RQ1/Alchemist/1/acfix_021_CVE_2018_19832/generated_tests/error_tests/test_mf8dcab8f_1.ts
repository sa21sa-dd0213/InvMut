import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mf8dcab8f by calling transferFrom with a calldata length between 39 and 99 bytes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set up balances and approvals to allow a transferFrom call
    // Give addr1 some tokens via distr (since distr is private, we use getTokens)
    // We need to send value to trigger getTokens
    const value = ethers.parseEther("2500");
    await owner.sendTransaction({ to: await instance.getAddress(), value });

    // Now addr1 has tokens, approve addr2 to spend them
    const instanceAddr1 = instance.connect(addr1);
    const approveAmount = ethers.parseEther("100");
    await instanceAddr1.approve(addr2.address, approveAmount);

    // Build a transferFrom call with minimal calldata length
    // The calldata must be at least 39 bytes (mutant) but less than 100 bytes (original)
    // A standard transferFrom call has function selector (4 bytes) + 3 parameters * 32 bytes = 100 bytes
    // To create calldata between 39-99 bytes, we can craft a raw transaction with shorter data
    // The simplest approach: use a call with only the function selector and partial data
    // We'll encode a call that has exactly 39 bytes (4 selector + 35 bytes of data)
    
    const iface = new ethers.Interface([
      "function transferFrom(address from, address to, uint256 amount)"
    ]);
    
    // Encode a call with truncated data (only 35 bytes instead of 96)
    const selector = iface.getFunction("transferFrom").selector;
    // Create 35 bytes of padded data (first 32 bytes for from, last 3 bytes for to truncated)
    const shortData = selector + "0".repeat(70); // 4 + 70 hex chars = 39 bytes
    // But this may not be valid ABI, so let's use a valid approach:
    // Actually we need valid parameters that pass the require checks
    // Better approach: use a valid call but with only 2 parameters encoded (64 bytes data + 4 selector = 68 bytes)
    // This is between 39 and 99 bytes and will pass the mutant's check but fail original
    
    // Encode with only 2 parameters (missing the _amount parameter)
    const shortEncoded = selector + 
      ethers.zeroPadValue(addr1.address, 32).slice(2) + 
      ethers.zeroPadValue(addr2.address, 32).slice(2);
    // This gives us 4 + 64 = 68 bytes of calldata
    
    // Execute the raw call with short calldata
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        data: shortEncoded
      })
    ).to.be.reverted; // Should revert on original (calldata < 100 bytes) but pass on mutant
  });
});