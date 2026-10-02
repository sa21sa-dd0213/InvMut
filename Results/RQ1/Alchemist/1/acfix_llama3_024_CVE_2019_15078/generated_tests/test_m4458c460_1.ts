import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m4458c460 - onlyPayloadSize modifier", function () {
  it("should revert when calling transfer with standard encoded parameters due to mutated payload size check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First get some tokens via getTokens() to have balance to transfer
    // Send ether to trigger getTokens() in receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now attempt to transfer tokens with standard encoded parameters
    // This should pass on original but fail on mutant due to size * 4 check
    const amount = ethers.parseEther("1000");
    await expect(
      instance.transfer(addr1.address, amount)
    ).to.be.reverted;
  });
});