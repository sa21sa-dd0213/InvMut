import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mf14f7a1d test", function () {
  it("should kill mutant by calling transfer with exact minimum payload size", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the function selector for transfer(address,uint256)
    const transferSelector = ethers.id("transfer(address,uint256)").substring(0, 10);
    
    // Encode the parameters with exact 32 bytes each (no padding needed as they are already 32 bytes)
    const to = ethers.zeroPadValue(addr1.address, 32);
    const amount = ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1")), 32);
    
    // Build the calldata with exactly 4 bytes (selector) + 64 bytes (two 32-byte params) = 68 bytes total
    const calldata = transferSelector + to.substring(2) + amount.substring(2);
    
    // Send the transaction with the exact minimum calldata length
    // The original contract allows this (msg.data.length >= 68), but the mutant requires > 68
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: calldata
    });

    // The transaction should succeed on original but fail on mutant
    // Since we're testing the mutant, we expect it to revert
    await expect(tx).to.be.reverted;
  });
});