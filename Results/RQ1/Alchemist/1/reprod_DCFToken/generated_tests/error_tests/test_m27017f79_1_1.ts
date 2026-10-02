import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - setWhiteBulk modifier removal", function () {
  it("should revert when non-cfo calls setWhiteBulk on original, but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const DCF = await ethers.getContractFactory("DCF");
    const liquidityReceiveAddress = owner.address;
    const dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();

    // Set cfo to addr1
    await dcf.connect(owner).setCaller(addr1.address);

    // Prepare test data for setWhiteBulk
    const addresses = [addr2.address];
    const status = true;

    // Attempt to call setWhiteBulk from unauthorized address (addr2)
    // On original contract with onlyCaller modifier, this should revert
    // On mutant without modifier, this would succeed
    await expect(
      dcf.connect(addr2).setWhiteBulk(addresses, status)
    ).to.be.revertedWith("onlyCaller");
  });
});