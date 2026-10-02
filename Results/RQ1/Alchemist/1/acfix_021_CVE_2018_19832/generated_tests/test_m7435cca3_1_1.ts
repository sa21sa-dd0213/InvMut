import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - onlyPayloadSize modifier", function () {
  it("should revert when calldata length is exactly size + 4 (mutant kills)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The transfer function uses onlyPayloadSize(2 * 32) = onlyPayloadSize(64)
    // Original accepts calldata length >= 68, mutant requires > 68
    // We'll craft a raw transaction with exactly 68 bytes of calldata

    // Get the function selector for transfer(address,uint256)
    const transferSelector = ethers.id("transfer(address,uint256)").slice(0, 10);

    // Build calldata: 4 bytes selector + 32 bytes address + 32 bytes amount = 68 bytes total
    const to = ethers.ZeroAddress;
    const amount = ethers.parseEther("1");

    // Encode the parameters manually to ensure exact calldata length
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [to, amount]
    );

    // Combine selector + encoded params (encoded params already has 64 bytes)
    const calldata = transferSelector + encodedParams.slice(2);

    // Verify calldata length is exactly 68 bytes (136 hex chars = 68 bytes)
    expect(Buffer.from(calldata.slice(2), "hex").length).to.equal(68);

    // Send raw transaction with exactly 68 bytes calldata
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: calldata,
    });

    // The original contract would accept this, the mutant should revert
    // Wait for the transaction to be mined and check it reverted
    await expect(tx.wait()).to.be.rejected;
  });
});