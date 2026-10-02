import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m05573959: owner call to withdrawAll should succeed in original but revert in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawal is possible
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls withdrawAll - should succeed in original contract
    // In the mutant, require(msg.sender != owner) will revert because owner == owner
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});