import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - m5cb1e703", function () {
  it("should revert on mutant when calling transfer with extra calldata, but pass on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute some tokens to owner so transfer can work
    // The constructor sets balances[owner] = totalDistributed (200000000e18)
    // Owner has tokens, so we can call transfer

    // Build a normal transfer call (68 bytes of calldata: 4 bytes selector + 32 bytes _to + 32 bytes _amount)
    const normalCalldata = instance.interface.encodeFunctionData("transfer", [
      addr1.address,
      ethers.parseEther("1"),
    ]);
    
    // Append extra bytes to simulate oversized calldata (e.g., 4 extra zero bytes)
    const extraCalldata = normalCalldata + "00000000";

    // Send the transaction with extra calldata
    // On original contract (>= check), this should succeed
    // On mutant (== check), this should revert
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: extraCalldata,
    });

    // Expect the transaction to revert because the mutant requires exact length
    // In a real test against the mutant, this would revert
    // Against the original, it would succeed
    await expect(tx).to.be.reverted;
  });
});