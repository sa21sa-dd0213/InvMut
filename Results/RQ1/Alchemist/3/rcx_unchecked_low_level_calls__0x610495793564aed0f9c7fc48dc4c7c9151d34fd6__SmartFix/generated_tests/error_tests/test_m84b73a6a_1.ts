import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant kill test - receive function equality change", function () {
  it("should succeed on original but fail on mutant when sending ether with depositsCount=0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial depositsCount is 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send ether to trigger receive() - should succeed on original (>= always true)
    // On mutant with ==, require((0+1)==0) will fail and revert
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.not.be.reverted;

    // Verify depositsCount incremented to 1
    expect(await instance.depositsCount()).to.equal(1);
  });
});