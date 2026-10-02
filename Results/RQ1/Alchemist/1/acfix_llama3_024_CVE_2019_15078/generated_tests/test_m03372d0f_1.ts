import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m03372d0f - onlyPayloadSize modifier with - instead of +", function () {
  it("should kill mutant by sending transfer with exactly 60 bytes of calldata (size - 4 for 2*32 params) which should revert on original but pass on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original onlyPayloadSize modifier for transfer() expects msg.data.length >= 2*32 + 4 = 68 bytes
    // The mutant expects msg.data.length >= 2*32 - 4 = 60 bytes
    // We'll craft a transfer call with exactly 60 bytes of calldata (function selector + 64 bytes of params = 68 normally)
    // But we want exactly 60 bytes total, so we truncate the last 8 bytes of the second parameter

    // First, get the function selector for transfer(address,uint256)
    const transferSelector = ethers.id("transfer(address,uint256)").substring(0, 10); // 0xa9059cbb

    // Build calldata: selector (4 bytes) + address (32 bytes, padded) + amount (32 bytes, padded) = 68 bytes total
    // To get 60 bytes, we remove the last 8 bytes (64 bits) from the amount parameter
    const paddedAddress = ethers.zeroPadValue(addr1.address, 32);
    const amount = ethers.toBeHex(ethers.parseEther("10"), 32);
    const fullCalldata = transferSelector + paddedAddress.slice(2) + amount.slice(2); // 4 + 32 + 32 = 68 bytes (136 hex chars)
    
    // Truncate to 60 bytes = 120 hex characters (excluding 0x)
    const truncatedCalldata = "0x" + fullCalldata.slice(2, 122); // 60 bytes

    // Send the transaction with truncated calldata
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: truncatedCalldata
    });

    // The original would revert (msg.data.length = 60 < 68)
    // The mutant would not revert (msg.data.length = 60 >= 60)
    // We expect the transaction to NOT revert on the mutant, meaning the mutant is killed
    await expect(tx.wait()).to.not.be.reverted;

    // Additional check: if it didn't revert, the transfer should have happened
    // This confirms the mutant accepted the truncated calldata
    const balance = await instance.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("10"));
  });
});