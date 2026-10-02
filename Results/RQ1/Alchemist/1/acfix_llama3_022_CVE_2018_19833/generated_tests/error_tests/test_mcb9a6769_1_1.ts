import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - mcb9a6769", function () {
  it("should revert on valid transfer to recipient with existing balance due to broken overflow check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so addr1 has a non-zero balance
    await instance.connect(owner).transfer(addr1.address, 100);

    // Now transfer from owner to addr1 (recipient already has balance)
    // In original contract this succeeds; in mutant it reverts because
    // require(balanceOf[_to] - _value >= balanceOf[_to]) fails for _value > 0
    await expect(
      instance.connect(owner).transfer(addr1.address, 50)
    ).to.not.be.reverted;
  });
});