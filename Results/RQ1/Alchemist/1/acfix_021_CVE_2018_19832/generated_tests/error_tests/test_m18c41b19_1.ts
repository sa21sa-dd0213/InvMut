import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m18c41b19 by sending transfer with calldata of length between 38 and 67 bytes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with some tokens for the transfer
    await instance.connect(owner).distr(addr1.address, ethers.parseEther("100"));

    // Prepare a transfer call with exactly 39 bytes of calldata (between 38 and 67)
    // The original check requires >= 68 bytes, mutant requires >= 38 bytes
    const transferSelector = instance.interface.getFunction("transfer").selector;
    const toAddress = ethers.zeroPadValue(addr1.address, 32);
    const amount = ethers.zeroPadValue(ethers.parseEther("1").toHexString(), 32);
    
    // Build calldata with only 39 bytes total (selector + partial data)
    // Selector is 4 bytes, so we need 35 more bytes to reach 39 total
    const shortCalldata = ethers.concat([
      transferSelector,
      toAddress.slice(0, 35) // Only 35 bytes of the 64-byte parameter
    ]);

    // Send the transaction with short calldata
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        data: shortCalldata
      })
    ).to.be.reverted;
  });
});