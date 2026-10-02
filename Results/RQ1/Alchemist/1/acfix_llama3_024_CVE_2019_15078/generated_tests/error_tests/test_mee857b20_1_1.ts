import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mee857b20 - onlyPayloadSize modifier change", function () {
  it("should kill mutant by sending transfer with extra calldata bytes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, ensure addr1 has some tokens by calling getTokens
    // Need to send ether to trigger getTokens via receive() or call directly
    // But getTokens has onlyWhitelist modifier, so we need to call from non-blacklisted address
    // Owner can call distr directly to give tokens to addr1
    // Use the distr function via a direct call to the private function? No, it's private.
    // Instead, call getTokens() which is public and canDistr + onlyWhitelist
    // Owner can call getTokens() since they're not blacklisted initially
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now construct a transfer call with extra calldata bytes
    // Normal transfer(address,uint256) = 4 bytes selector + 32 bytes address + 32 bytes amount = 68 bytes
    // We'll add an extra 32 bytes of zeros at the end to make calldata length 100 bytes
    const transferSelector = instance.interface.getFunction("transfer").selector;
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const normalCalldata = abiCoder.encode(
      ["address", "uint256"],
      [addr1.address, ethers.parseEther("1")]
    );

    // Create extra padded calldata (original 68 bytes + extra 32 bytes)
    const extraCalldata = ethers.hexlify(
      ethers.concat([
        transferSelector,
        normalCalldata,
        ethers.zeroPadValue("0x", 32) // 32 extra zero bytes
      ])
    );

    // This should succeed on original (>= check passes) but revert on mutant (<= check fails)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        data: extraCalldata
      })
    ).to.be.reverted;

    // Verify that normal transfer still works on both (68 bytes calldata)
    const normalTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: ethers.concat([transferSelector, normalCalldata])
    });
    await normalTx.wait();
  });
});