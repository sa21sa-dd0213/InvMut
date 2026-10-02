import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling transfer with insufficient calldata (short address) in original, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the function selector for transfer(address,uint256)
    const transferSelector = ethers.id("transfer(address,uint256)").slice(0, 10);

    // Build calldata with a truncated address (19 bytes instead of 20)
    // Proper encoding: selector (4 bytes) + address (32 bytes padded) + amount (32 bytes)
    // We'll send only 4 + 19 + 32 = 55 bytes total (missing 1 byte from address)
    const shortAddress = "0x" + "01".repeat(19); // 19 bytes
    const amount = ethers.parseEther("100");

    // Encode the full data then truncate
    const fullData = instance.interface.encodeFunctionData("transfer", [shortAddress, amount]);
    // Remove the last byte of the address portion (the 36th byte of calldata after selector)
    // Keep 4 bytes selector + 19 bytes address (38 hex chars) + 32 bytes amount
    const truncatedData = "0x" + fullData.slice(2, 2 + 8 + 38 * 2);

    // Send the transaction with truncated calldata directly to the contract
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: truncatedData
    });

    // In the original contract, this should revert due to the payload size check
    // In the mutant (with size - 4), it may succeed
    await expect(tx).to.be.reverted;
  });
});