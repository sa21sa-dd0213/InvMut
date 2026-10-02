import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - onlyPayloadSize modifier", function () {
  it("should revert when transfer is called with extra calldata (mutant uses == instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get some tokens to transfer
    await instance.connect(owner).NETM();

    // Encode a normal transfer call
    const transferData = instance.interface.encodeFunctionData("transfer", [
      addr1.address,
      ethers.parseEther("1"),
    ]);

    // Create extra calldata by appending additional bytes
    const extraBytes = ethers.toBeHex("0xdeadbeef", 4);
    const paddedData = transferData + extraBytes.slice(2); // Append extra bytes

    // Send raw transaction with extra calldata
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: paddedData,
    });

    // The original contract would accept this (>=), but the mutant (==) should revert
    await expect(tx).to.be.reverted;
  });

  it("normal transfer without extra calldata should succeed (control test)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.connect(owner).NETM();

    // Normal transfer with exact payload size should work in both versions
    await expect(
      instance.connect(owner).transfer(addr1.address, ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});