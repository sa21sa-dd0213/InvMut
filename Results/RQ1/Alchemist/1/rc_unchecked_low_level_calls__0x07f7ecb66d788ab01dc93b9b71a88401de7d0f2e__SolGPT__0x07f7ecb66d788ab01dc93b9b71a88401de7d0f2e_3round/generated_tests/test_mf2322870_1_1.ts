import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mf2322870 - onlyOwner modifier", function () {
  it("should revert when non-owner calls OpenToThePublic() but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Non-owner tries to call owner-only function OpenToThePublic()
    await expect(
      instance.connect(addr1).OpenToThePublic()
    ).to.be.reverted;
  });
});