import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m05573959 by having owner call withdrawAll and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to allow withdrawal
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to call withdrawAll successfully in original contract
    // In mutant, this will revert because require(msg.sender != owner) blocks the owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});