import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfdf4ca44 test", function () {
  it("should revert when creator calls migrateTo (mutant changes == to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ETH first so there's balance to migrate
    await instance.connect(owner).deposit({ value: ethers.parseEther("1") });

    // Original: creator can call migrateTo (passes)
    // Mutant: require(creator != msg.sender) -> creator call should revert
    await expect(
      instance.connect(owner).migrateTo(addr1.address)
    ).to.be.reverted;
  });
});