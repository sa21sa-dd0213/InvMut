import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test (mb6ced059)", function () {
  it("should succeed when sending exactly 10 ether (kills mutant that requires msg.value+1 == 10)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The transaction should succeed (not revert) in the original contract
    // The mutant would revert because it requires msg.value+1 == 10 ether, i.e., 9 ether
    await expect(tx).to.not.be.reverted;
  });
});