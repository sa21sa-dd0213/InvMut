import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m5bba0f52 by testing zero-amount transfer between non-whitelisted addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Get the deployed contract address
    const dcfAddress = await instance.getAddress();

    // Transfer some tokens to addr1 so it can perform transfers
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);

    // Verify addr1 has tokens
    expect(await instance.balanceOf(addr1.address)).to.equal(transferAmount);

    // Set addr2 as non-whitelisted (default should be false)
    // Transfer 0 tokens from addr1 to addr2 - should succeed in original but fail in mutant
    await expect(
      instance.connect(addr1).transfer(addr2.address, 0)
    ).to.not.be.reverted;

    // Also verify that no balance changes occurred (zero transfer)
    expect(await instance.balanceOf(addr1.address)).to.equal(transferAmount);
    expect(await instance.balanceOf(addr2.address)).to.equal(0);
  });
});