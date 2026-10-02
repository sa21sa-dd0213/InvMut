import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mde82fac5", function () {
  it("should revert when sending more than exactly 10 ether (detect >= mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether to trigger the mutant's >= check (should pass mutant, fail original)
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11"),
      })
    ).to.be.reverted;
  });
});