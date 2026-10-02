import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m6a150ad9 - onlyPayloadSize removal", function () {
  it("should revert on transferFrom with insufficient calldata in original but not in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: transfer some tokens to addr1 so we can call transferFrom
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Approve owner to spend addr1's tokens
    await instance.connect(addr1).approve(owner.address, transferAmount);

    // Craft calldata for transferFrom with only 2 parameters (64 bytes) instead of 3 (96 bytes)
    // Function selector for transferFrom(address,address,uint256): 0x23b872dd
    const selector = "0x23b872dd";
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const fromPadded = ethers.zeroPadValue(addr1.address, 32);
    const toPadded = ethers.zeroPadValue(addr2.address, 32);
    // Deliberately omit the third parameter (uint256 amount)
    const shortCalldata = selector + fromPadded.slice(2) + toPadded.slice(2);

    // Send raw transaction with short calldata
    const tx = await owner.sendTransaction({
      to: instance.target,
      data: shortCalldata,
    });

    // The original contract would revert due to onlyPayloadSize assertion
    // The mutant (without the modifier) would not revert and might execute with default amount=0
    await expect(tx).to.be.reverted;
  });
});