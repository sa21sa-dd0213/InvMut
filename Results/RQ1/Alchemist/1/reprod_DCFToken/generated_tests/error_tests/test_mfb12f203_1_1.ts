import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - USDT address mutation", function () {
  it("should detect when USDT address is incorrectly set to DCT address instead of real USDT", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF contract with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Get the USDT address from the contract
    const usdtAddress = await instance.USDT();
    const dctAddress = await instance.DCT();

    // The mutant replaces USDT with DCT address, making them equal
    // Original contract should have different addresses
    // If they are equal, the mutant is detected
    expect(usdtAddress).to.not.equal(dctAddress,
      "USDT address should not equal DCT address - mutant detected if they are the same");

    // Additional verification: check that USDT is the correct BSC USDT address
    const correctUSDT = "0x55d398326f99059fF775485246999027B3197955";
    expect(usdtAddress).to.equal(correctUSDT,
      "USDT address should be the official BSC USDT address");
  });
});