import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m36fe1063 - transfer payload size", function () {
  it("should revert when transfer is called with a valid 68-byte payload (original behavior) but accept it in the mutant with 38-byte payload requirement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with some tokens via transfer from owner
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));

    // Test 1: 50-byte payload (should revert for both original and mutant since < 38)
    const transferSelector = ethers.id("transfer(address,uint256)").slice(0, 10);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // Create 50-byte payload (4 selector + 32 address + 14 bytes of uint256)
    const addressEncoded = abiCoder.encode(["address"], [addr1.address]).slice(2);
    const shortUint = "0x" + "00".repeat(14); // 14 bytes of zeros
    const fiftyBytePayload = transferSelector + addressEncoded + shortUint.slice(2);

    // Original should revert due to payload size check (< 68)
    await expect(
      owner.sendTransaction({
        to: instance.target,
        data: fiftyBytePayload
      })
    ).to.be.reverted;

    // Test 2: 38-byte payload (should be accepted by mutant but rejected by original)
    const twoByteUint = "0x" + "00".repeat(2); // 2 bytes of zeros
    const thirtyEightPayload = transferSelector + addressEncoded + twoByteUint.slice(2);

    // Original reverts (payload < 68), mutant would not revert - this kills the mutant
    await expect(
      owner.sendTransaction({
        to: instance.target,
        data: thirtyEightPayload
      })
    ).to.be.reverted;
  });
});