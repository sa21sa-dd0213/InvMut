import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m794efcee - balanceOf returns zero", function () {
  it("should detect mutant by checking balanceOf returns actual balance after getTokens", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with ETH to call getTokens (payable)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // addr1 calls getTokens to receive tokens
    await instance.connect(addr1).getTokens({
      value: ethers.parseEther("1")
    });

    // Get the token balance for addr1 after receiving tokens
    const balance = await instance.balanceOf(addr1.address);

    // The mutant always returns 0, so if balance is 0, the mutant is killed
    // Original contract would return the actual non-zero balance
    expect(balance).to.be.gt(0);
  });
});